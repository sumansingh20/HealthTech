import {
  createEvent,
  createId,
  createServer,
  demoUsers,
  getBearerToken,
  hashSecret,
  healthResponse,
  loginSchema,
  sendJson,
  signJwt,
  verifyJwt,
  type User
} from '@icu/shared';

const serviceName = 'auth-service';
const port = Number(process.env.PORT ?? 4001);
const jwtSecret = process.env.JWT_SECRET ?? 'local-development-secret-change-me';
const users = new Map<string, User>(demoUsers.map((user) => [user.email, user]));

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
    handler: ({ res, body }) => {
      const credentials = loginSchema.parse(body);
      const user = users.get(credentials.email.toLowerCase());

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
    handler: ({ res }) => sendJson(res, 200, { users: Array.from(users.values()).map(publicUser) })
  }
]);

server.listen(port, () => {
  console.log(`${serviceName} listening on :${port}`);
});
