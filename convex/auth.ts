import {convexAuth} from '@convex-dev/auth/server';
import {
  ResendOtpMartieEn,
  ResendOtpMartieJa,
  ResendOtpMartieKo,
} from './ResendOTP';

export const {auth, signIn, signOut, store, isAuthenticated} = convexAuth({
  providers: [ResendOtpMartieEn, ResendOtpMartieKo, ResendOtpMartieJa],
});
