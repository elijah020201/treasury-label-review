import { createHash, randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Expected, Review } from "../src/domain";
import { VERSION } from "../src/domain";
import { RequestError } from "../src/queue";
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ maxAttempts: 2 }));
const TableName = process.env.TABLE_NAME!;
export function digest(bytes: Buffer, expected: Expected) {
  return createHash("sha256")
    .update(bytes)
    .update(JSON.stringify(expected))
    .update(VERSION)
    .digest("hex");
}
const now = () => Math.floor(Date.now() / 1000);
export async function getReview(pk: string) {
  const r = await db.send(
    new GetCommand({ TableName, Key: { pk }, ConsistentRead: true }),
  );
  return r.Item && r.Item.expires > now() ? r.Item : undefined;
}
export async function lock(pk: string) {
  const lease = randomUUID();
  try {
    await db.send(
      new PutCommand({
        TableName,
        Item: {
          pk,
          lease,
          state: "processing",
          lockedUntil: now() + 60,
          expires: now() + 86400,
        },
        ConditionExpression:
          "attribute_not_exists(pk) OR expires < :now OR (#s = :processing AND lockedUntil < :now)",
        ExpressionAttributeNames: { "#s": "state" },
        ExpressionAttributeValues: {
          ":now": now(),
          ":processing": "processing",
        },
      }),
    );
    return lease;
  } catch (e) {
    if (e instanceof Error && e.name === "ConditionalCheckFailedException")
      throw new RequestError(
        "This review is already processing. Wait briefly and retry.",
        true,
        409,
      );
    throw e;
  }
}
export async function save(pk: string, lease: string, review: Review) {
  await db.send(
    new PutCommand({
      TableName,
      Item: { pk, lease, state: "complete", review, expires: now() + 86400 },
      ConditionExpression: "lease = :lease",
      ExpressionAttributeValues: { ":lease": lease },
    }),
  );
}
export async function unlock(pk: string, lease: string) {
  await db.send(
    new DeleteCommand({
      TableName,
      Key: { pk },
      ConditionExpression: "lease = :lease",
      ExpressionAttributeValues: { ":lease": lease },
    }),
  );
}
export async function quota(session: string) {
  const day = new Date().toISOString().slice(0, 10);
  const keys: [string, number, number][] = [
    ["quota:lifetime", 2000, now() + 366 * 86400],
    [`quota:day:${day}`, 1000, now() + 172800],
    [`quota:session:${session}`, 500, now() + 86400],
  ];
  try {
    await db.send(
      new TransactWriteCommand({
        TransactItems: keys.map(([pk, limit, expires]) => ({
          Update: {
            TableName,
            Key: { pk },
            UpdateExpression: "SET expires = :expires ADD #n :one",
            ConditionExpression: "attribute_not_exists(#n) OR #n < :limit",
            ExpressionAttributeNames: { "#n": "count" },
            ExpressionAttributeValues: {
              ":expires": expires,
              ":one": 1,
              ":limit": limit,
            },
          },
        })),
      }),
    );
  } catch (e) {
    if (e instanceof Error && e.name === "TransactionCanceledException")
      throw new RequestError(
        "The live review allowance has been reached. Contact the prototype owner.",
        false,
        429,
      );
    throw e;
  }
}
export async function loginQuota(ip: string) {
  const key = createHash("sha256").update(ip).digest("hex");
  try {
    await db.send(
      new UpdateCommand({
        TableName,
        Key: { pk: `login:${key}:${Math.floor(Date.now() / 60000)}` },
        UpdateExpression: "SET expires = :ttl ADD #n :one",
        ConditionExpression: "attribute_not_exists(#n) OR #n < :max",
        ExpressionAttributeNames: { "#n": "count" },
        ExpressionAttributeValues: {
          ":ttl": now() + 3600,
          ":one": 1,
          ":max": 10,
        },
      }),
    );
  } catch (e) {
    if (e instanceof Error && e.name === "ConditionalCheckFailedException")
      throw new RequestError(
        "Too many access attempts. Try again in a minute.",
        false,
        429,
      );
    throw e;
  }
}
