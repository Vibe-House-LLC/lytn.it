import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { shorten } from '../functions/shorten/resource';

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any unauthenticated user can "create", "read", "update", 
and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({
 shorten: a
  .query()
  .arguments({
    url: a.string(),
  })
  .returns(a.string())
  .authorization((allow) => [allow.guest()])
  .handler(a.handler.function(shorten)),

  shortenedUrl: a.model({
    id: a.id(),
    url: a.string(),
    destination: a.string(),
    ip: a.string(),
    createdAt: a.datetime(),
  })
  .authorization((allow) => [allow.guest().to(['create', 'read'])]),

  iterator: a.model({
    id: a.id(),
    seed: a.string(),
    iteration: a.integer(),
  })
  .authorization((allow) => [allow.guest().to(['create', 'read', 'update'])])

});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
