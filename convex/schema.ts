import {defineSchema} from 'convex/server';
import {authTables} from '@convex-dev/auth-v1/server';

import {userProfilesTable} from './schema/userProfiles';
import {imagesTable} from './schema/images';
import {categoriesTable} from './schema/categories';
import {quizzesTable} from './schema/quizzes';
import {quizResultsTable} from './schema/quizResults';
import {userCategoriesTable} from './schema/userCategories';
import {ranksTable} from './schema/ranks';
import {rankCategoriesTable} from './schema/rankCategories';
import {quizLanguagesTable} from './schema/quizLanguages';
import {providersTable} from './schema/providers';
import {chatsTable} from './schema/chats';
import {purchasesTable} from './schema/purchases';
import {appVersionsTable} from './schema/appVersions';
import {articlesTable} from './schema/articles';
import {articleLanguagesTable} from './schema/articleLanguages';
import {dailyChallengesTable} from './schema/dailyChallenges';
import {leaguesTable} from './schema/leagues';
import {reviewQueueTable} from './schema/reviewQueue';
import {quizSubmissionsTable} from './schema/quizSubmissions';
import {adRewardEventsTable} from './schema/adRewardEvents';
import {
  battlesTable,
  battleRoundsTable,
  battlePlayersTable,
  battleStatsTable,
  battleRivalsTable,
} from './schema/battles';
import {
  analyticsVisitorsTable,
  analyticsVisitorDaysTable,
} from './schema/analytics';

export default defineSchema({
  ...authTables,
  userProfiles: userProfilesTable,
  images: imagesTable,
  categories: categoriesTable,
  userCategories: userCategoriesTable,
  quizzes: quizzesTable,
  quizResults: quizResultsTable,
  quizLanguages: quizLanguagesTable,
  ranks: ranksTable,
  rankCategories: rankCategoriesTable,
  providers: providersTable,
  chats: chatsTable,
  purchases: purchasesTable,
  appVersions: appVersionsTable,
  articles: articlesTable,
  articleLanguages: articleLanguagesTable,
  dailyChallenges: dailyChallengesTable,
  adRewardEvents: adRewardEventsTable,
  leagues: leaguesTable,
  reviewQueue: reviewQueueTable,
  quizSubmissions: quizSubmissionsTable,
  analyticsVisitors: analyticsVisitorsTable,
  analyticsVisitorDays: analyticsVisitorDaysTable,
  battles: battlesTable,
  battleRounds: battleRoundsTable,
  battlePlayers: battlePlayersTable,
  battleStats: battleStatsTable,
  battleRivals: battleRivalsTable,
});
