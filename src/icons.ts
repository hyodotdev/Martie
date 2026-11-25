import FontNanumR from '../assets/fonts/NanumSquareRoundOTFR.otf';
import FontNanumB from '../assets/fonts/NanumSquareRoundOTFB.otf';
import FontNanumL from '../assets/fonts/NanumSquareRoundOTFL.otf';
import MASK from '../assets/icons/mask.png';
import BULB from '../assets/icons/bulb.png';
import Martie from '../assets/icons/martie.png';
import MartieBasic from '../assets/icons/martie_basic.png';
import MartieEye from '../assets/icons/martie_eye.png';
import MartieImpressed from '../assets/icons/martie_impressed.png';
import MartieSleep from '../assets/icons/martie_sleep.png';
import MartieSmart from '../assets/icons/martie_smart.png';
import MartieSmile from '../assets/icons/martie_smile.png';
import MartieSweat from '../assets/icons/martie_sweat.png';
import WordMark from '../assets/icons/wordmark.png';
import Trophy from '../assets/icons/trophy.png';
import Pencil from '../assets/icons/pencil.png';
import MartieMcTalkOpen from '../assets/sprites/martie_mc_talk_open.png';
import MartieMcTalkClosed from '../assets/sprites/martie_mc_talk_closed.png';
import MartieMcThink from '../assets/sprites/martie_mc_think.png';
import MartieMcCheer from '../assets/sprites/martie_mc_cheer.png';
import MartieMcShock from '../assets/sprites/martie_mc_shock.png';
import MartieMcNervous from '../assets/sprites/martie_mc_nervous.png';

export const IC_MASK = MASK;
export const IC_MARTIE = Martie;
export const IC_BULB = BULB;
export const IC_MARTIE_BASIC = MartieBasic;
export const IC_MARTIE_EYE = MartieEye;
export const IC_MARTIE_SMART = MartieSmart;
export const IC_MARTIE_SLEEP = MartieSleep;
export const IC_MARTIE_SMILE = MartieSmile;
export const IC_MARTIE_IMPRESSED = MartieImpressed;
export const IC_MARTIE_SWEAT = MartieSweat;
export const IC_WORDMARK = WordMark;
export const IC_TROPHY = Trophy;
export const IC_PENCIL = Pencil;

// Martie the quiz commentator, one frame per pose.
export const SPRITE_MARTIE_MC = {
  talkOpen: MartieMcTalkOpen,
  talkClosed: MartieMcTalkClosed,
  think: MartieMcThink,
  cheer: MartieMcCheer,
  shock: MartieMcShock,
  nervous: MartieMcNervous,
} as const;

export const FONT_NANUM_R = FontNanumR;
export const FONT_NANUM_B = FontNanumB;
export const FONT_NANUM_L = FontNanumL;
