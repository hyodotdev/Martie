import {convexAuth} from '@convex-dev/auth-v1/server';
import {
  ResendOtpMartieEn,
  ResendOtpMartieJa,
  ResendOtpMartieKo,
} from './ResendOTP';

export const {auth, signIn, signOut, store, isAuthenticated} = convexAuth({
  providers: [ResendOtpMartieEn, ResendOtpMartieKo, ResendOtpMartieJa],
});
