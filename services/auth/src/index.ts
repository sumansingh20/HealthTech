import {
  createEvent,
  createId,
  createServer,
  createUserSchema,
  getBearerToken,
  hashSecret,
  healthResponse,
  loginSchema,
  sendJson,
  signJwt,
  verifyJwt,
  type User
} from '@icu/shared';
import { getMongoDb } from '@icu/shared';

const serviceName = 'auth-service';
const port = Number(process.env.PORT ?? 4001);
const jwtSecret = process.env.JWT_SECRET ?? 'local-development-secret-change-me';
let usersColl: any = null;

function publicUser(user: User) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

const server = createServer([
  {
    method: 'GET',
    pattern: /^\/health$/,
    handler: ({ res }) => sendJson(res, 200, healthResponse(serviceName))
  },
  {
    method: 'POST',
    pattern: /^\/auth\/login$|^\/login$/,
    handler: async ({ res, body }) => {
      const credentials = loginSchema.parse(body);
      const email = credentials.email.toLowerCase();
      const user = await usersColl.findOne({ email });

      if (!user || !user.active || user.passwordHash !== hashSecret(credentials.password)) {
        sendJson(res, 401, { error: 'invalid_credentials' });
        return;
      }

      const token = signJwt(
        {
          sub: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        jwtSecret
      );

      sendJson(res, 200, {
        token,
        user: publicUser(user),
        event: createEvent({
          id: createId('event'),
          name: 'auth.user.logged_in',
          source: serviceName,
          payload: { userId: user.id, role: user.role }
        })
      });
    }
  },
  {
    method: 'POST',
    pattern: /^\/auth\/register$|^\/register$/,
    handler: async ({ res, body }) => {
      const input = createUserSchema.parse(body);
      const email = input.email.toLowerCase();
      const existing = await usersColl.findOne({ email });
      if (existing) {
        sendJson(res, 409, { error: 'user_exists' });
        return;
      }

      const user: User = {
        id: createId('user'),
        email,
        name: input.name,
        role: input.role,
        passwordHash: hashSecret(input.password),
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await usersColl.insertOne(user);
      sendJson(res, 201, { user: publicUser(user) });
    }
  },
  {
    method: 'POST',
    pattern: /^\/auth\/forgot-password$|^\/forgot-password$/,
    handler: ({ res, body }) => {
      const input = body as { email?: string };
      sendJson(res, 200, {
        resetRequested: Boolean(input.email && users.has(input.email.toLowerCase()))
      });
    }
  },
  {
    method: 'GET',
    pattern: /^\/auth\/me$|^\/me$/,
    handler: ({ req, res }) => {
      const token = getBearerToken(req);
      if (!token) {
        sendJson(res, 401, { error: 'missing_token' });
        return;
      }

      try {
        const principal = verifyJwt(token, jwtSecret);
        sendJson(res, 200, { principal });
      } catch (error) {
        sendJson(res, 401, { error: 'invalid_token', message: error instanceof Error ? error.message : 'Invalid token' });
      }
    }
  },
  {
    method: 'GET',
    pattern: /^\/users$/,
    handler: async ({ res }) => {
      const docs = await usersColl.find({}).toArray();
      sendJson(res, 200, { users: docs.map(publicUser) });
    }
  }
]);

async function initAndListen() {
  try {
    const db = await getMongoDb();
    usersColl = db.collection('users');
    await usersColl.createIndex({ email: 1 }, { unique: true }).catch(() => {});

    server.listen(port, () => {
      console.log(`${serviceName} listening on :${port}`);
    });
  } catch (err) {
    console.error('Failed to initialize database connection', err);
    process.exit(1);
  }
}

void initAndListen();
