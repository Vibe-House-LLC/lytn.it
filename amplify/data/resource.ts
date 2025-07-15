import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { vainId } from '../functions/vainId/resource';
import { emailReportedLink } from '../functions/emailReportedLink/resource';
import { userManagement } from '../functions/userManagement/resource';

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

  // Define all enums with proper authorization
  UrlStatus: a.enum([
    'active',
    'reported',
    'inactive',
  ]),

  ReportStatus: a.enum([
    'pending',
    'reviewed',
    'resolved',
    'dismissed'
  ]),

  DeletionReason: a.enum([
    'spam',
    'inappropriate_content',
    'copyright_violation',
    'malware',
    'user_request',
    'user_deleted_link',
    'terms_violation',
    'admin_action',
    'expired'
  ]),

  ReportReason: a.enum([
    'spam',
    'malware',
    'phishing',
    'inappropriate_content',
    'copyright_violation',
    'fraud',
    'harassment',
    'other'
  ]),

  ReportDeletionReason: a.enum([
    'spam',
    'inappropriate_content',
    'copyright_violation',
    'user_request',
    'admin_action',
    'resolved'
  ]),

  AdminActionType: a.enum([
    'status_change',
    'soft_delete',
    'restore',
    'add_note',
    'update_fields'
  ]),

  emailReportedLink: a.query()
    .arguments({
      link: a.string().required(),
      reason: a.string().required(),
      reportedBy: a.string(),
      reportedAt: a.datetime().required()
    })
    .returns(a.ref('emailReportedLinkOutput'))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(emailReportedLink)),

  vainId: a
    .query()
    .arguments({})
    .returns(a.ref('vainIdReturn'))
    .handler(a.handler.function(vainId))
    .authorization((allow) => [allow.guest(), allow.authenticated()]),

  userManagement: a
    .query()
    .arguments({
      operation: a.string().required(),
      userId: a.string(),
      email: a.string(),
      password: a.string(),
      temporary: a.boolean(),
      attributes: a.json(),
      groupName: a.string(),
      limit: a.integer(),
      nextToken: a.string(),
      filter: a.string()
    })
    .returns(a.json())
    .authorization((allow) => [allow.group('admins')])
    .handler(a.handler.function(userManagement)),

  shortenedUrl: a.model({
    id: a.id().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    destination: a.url().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    ip: a.ipAddress().authorization(allow => [
      allow.guest().to(['create']),
      allow.authenticated().to(['create']),
      allow.group('admins'),
      allow.owner().to(['create'])
    ]),
    createdAt: a.datetime().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    deletedAt: a.datetime().authorization(allow => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    deletedReason: a.ref('DeletionReason').authorization(allow => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    status: a.ref('UrlStatus').authorization(allow => [
      allow.guest().to(['create', 'read']), // Guests can only read status
      allow.authenticated().to(['create', 'read']),
      allow.group('admins'), // Only admins can update status
      allow.owner().to(['create', 'read'])
    ]),
    source: a.string().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    owner: a.string().authorization(allow => [allow.owner().to(['read', 'create']), allow.group('admins')]),
    reports: a.hasMany('reportedLink', 'shortenedUrlId'),
  })
    .secondaryIndexes((index) => [
      index("owner").sortKeys(["createdAt"]),
      index("status").sortKeys(["createdAt"]),
      index("source").sortKeys(["createdAt"]),
      index("ip").sortKeys(["createdAt"]),
    ])
    .authorization((allow) => [
      allow.guest().to(['create']),
      allow.authenticated().to(['create']),
      allow.owner().to(['create', 'read', 'update']),
      allow.group('admins')
    ]),

  reportedLink: a.model({
    id: a.id().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    lytnUrl: a.url().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    shortId: a.string().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    destinationUrl: a.url().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    reason: a.ref('ReportReason').authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    reporterEmail: a.email().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    reporterIp: a.ipAddress().authorization(allow => [
      allow.guest().to(['create']),
      allow.authenticated().to(['create']),
      allow.group('admins'),
      allow.owner().to(['create'])
    ]),
    status: a.ref('ReportStatus').authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read', 'update'])
    ]),
    createdAt: a.datetime().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    updatedAt: a.datetime().authorization(allow => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read', 'update'])
    ]),
    deletedAt: a.datetime().authorization(allow => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read', 'update'])
    ]),
    deletedReason: a.ref('ReportDeletionReason').authorization(allow => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    source: a.string().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    owner: a.string().authorization(allow => [
      allow.guest().to(['create']),
      allow.authenticated().to(['create']),
      allow.owner().to(['read', 'delete']),
      allow.group('admins')
    ]),
    shortenedUrlId: a.id().authorization(allow => [
      allow.guest().to(['create', 'read']),
      allow.authenticated().to(['create', 'read']),
      allow.group('admins'),
      allow.owner().to(['create', 'read'])
    ]),
    shortenedUrl: a.belongsTo('shortenedUrl', 'shortenedUrlId'),
    lastAdminAction: a.ref('AdminActionType').authorization(allow => [
      allow.group('admins'),
      allow.owner().to(['read'])
    ]),
    lastAdminEmail: a.email().authorization(allow => [
      allow.group('admins'),
      allow.owner().to(['read'])
    ]),
    adminNotes: a.string().authorization(allow => [
      allow.group('admins'),
      allow.owner().to(['read'])
    ]),
    actionLogs: a.hasMany('adminActionLog', 'reportedLinkId'),
  })
    .secondaryIndexes((index) => [
      index("reporterEmail").sortKeys(["createdAt"]),
      index("status").sortKeys(["createdAt"]),
      index("reason").sortKeys(["createdAt"]),
      index("shortenedUrlId").sortKeys(["createdAt"]),
    ])
    .authorization((allow) => [
      allow.guest().to(['create']),
      allow.authenticated().to(['create']),
      allow.owner().to(['create', 'read']),
      allow.group('admins')
    ]),

  adminActionLog: a.model({
    id: a.id().authorization(allow => [
      allow.group('admins')
    ]),
    reportedLinkId: a.id().authorization(allow => [
      allow.group('admins')
    ]),
    reportedLink: a.belongsTo('reportedLink', 'reportedLinkId'),
    actionType: a.ref('AdminActionType').authorization(allow => [
      allow.group('admins')
    ]),
    adminEmail: a.email().authorization(allow => [
      allow.group('admins')
    ]),
    adminUserId: a.string().authorization(allow => [
      allow.group('admins')
    ]),
    previousValue: a.string().authorization(allow => [
      allow.group('admins')
    ]),
    newValue: a.string().authorization(allow => [
      allow.group('admins')
    ]),
    notes: a.string().authorization(allow => [
      allow.group('admins')
    ]),
    createdAt: a.datetime().authorization(allow => [
      allow.group('admins')
    ]),
  })
    .secondaryIndexes((index) => [
      index("reportedLinkId").sortKeys(["createdAt"]),
      index("adminEmail").sortKeys(["createdAt"]),
      index("actionType").sortKeys(["createdAt"]),
    ])
    .authorization((allow) => [
      allow.group('admins')
    ]),

  userProfile: a.model({
    id: a.id().authorization(allow => [
      allow.group('admins')
    ]),
    userId: a.string().authorization(allow => [
      allow.group('admins')
    ]),
    email: a.email().authorization(allow => [
      allow.group('admins')
    ]),
    displayName: a.string().authorization(allow => [
      allow.group('admins')
    ]),
    isActive: a.boolean().default(true).authorization(allow => [
      allow.group('admins')
    ]),
    lastLoginAt: a.datetime().authorization(allow => [
      allow.group('admins')
    ]),
    createdAt: a.datetime().authorization(allow => [
      allow.group('admins')
    ]),
    createdBy: a.string().authorization(allow => [
      allow.group('admins')
    ]),
    linksCreated: a.integer().default(0).authorization(allow => [
      allow.group('admins')
    ]),
    reportsSubmitted: a.integer().default(0).authorization(allow => [
      allow.group('admins')
    ]),
    userSessions: a.hasMany('userSession', 'userId'),
  })
    .secondaryIndexes((index) => [
      index("userId").sortKeys(["createdAt"]),
      index("email").sortKeys(["createdAt"]),
    ])
    .authorization((allow) => [
      allow.group('admins')
    ]),

  userSession: a.model({
    id: a.id().authorization(allow => [
      allow.group('admins')
    ]),
    userId: a.string().authorization(allow => [
      allow.group('admins')
    ]),
    userProfile: a.belongsTo('userProfile', 'userId'),
    loginAt: a.datetime().authorization(allow => [
      allow.group('admins')
    ]),
    ipAddress: a.ipAddress().authorization(allow => [
      allow.group('admins')
    ]),
    userAgent: a.string().authorization(allow => [
      allow.group('admins')
    ]),
    sessionDuration: a.integer().authorization(allow => [
      allow.group('admins')
    ]),
  })
    .secondaryIndexes((index) => [
      index("userId").sortKeys(["loginAt"]),
      index("ipAddress").sortKeys(["loginAt"]),
    ])
    .authorization((allow) => [
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
    allow.resource(vainId),
    allow.resource(userManagement),
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
