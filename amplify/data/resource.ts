import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { vainId } from '../functions/vainId/resource';
import { emailReportedLink } from '../functions/emailReportedLink/resource';

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any unauthenticated user can "create", "read", "update", 
and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({

  vainIdReturn: a.customType({
    id: a.string()
  }),

  emailReportedLinkInput: a.customType({
    link: a.string(),
    reason: a.string(),
    reportedBy: a.string(),
    reportedAt: a.datetime()
  }),

  emailReportedLinkOutput: a.customType({
    message: a.json()
  }),

  emailReportedLink: a.query()
    .arguments({
      input: a.ref('emailReportedLinkInput')
    })
    .returns(a.ref('emailReportedLinkOutput'))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(emailReportedLink)),

  vainId: a
    .query()
    .arguments({})
    .returns(a.ref('vainIdReturn'))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(vainId)),

  shortenedUrl: a.model({
    id: a.id().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins')
    ]),
    url: a.string().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins')
    ]),
    destination: a.string().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins')
    ]),
    ip: a.string().authorization(allow => [
      allow.guest().to(['create']),
      allow.authenticated().to(['create']),
      allow.group('admins')
    ]),
    createdAt: a.datetime().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins')
    ]),
  })
  .authorization((allow) => [
    allow.guest().to(['create']),
    allow.authenticated().to(['create']),
    allow.group('admins')
  ]),

  reportedLink: a.model({
    id: a.id(),
    lytnUrl: a.string(),
    shortId: a.string(),
    destinationUrl: a.string(),
    reason: a.string(),
    reporterEmail: a.string(),
    reporterIp: a.string(),
    status: a.enum(['pending', 'reviewed', 'resolved', 'dismissed']),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
  .authorization((allow) => [
    allow.guest().to(['create']),
    allow.authenticated().to(['create']),
    allow.group('admins')
  ]),

  iterator: a.model({
    id: a.id(),
    seed: a.string(),
    iteration: a.integer(),
  })
  .authorization((allow) => [
    allow.group('admins')
  ])
})
.authorization((allow) => [
  allow.resource(vainId)
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool'
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
