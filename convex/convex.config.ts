import {defineApp} from 'convex/server';
import auth from '@convex-dev/auth/convex.config';
import authEmail from '@convex-dev/auth/components/email/convex.config';

const app = defineApp();
app.use(auth);
app.use(authEmail);

export default app;
