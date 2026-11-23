/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as actions from "../actions.js";
import type * as adReward from "../adReward.js";
import type * as amazon from "../amazon.js";
import type * as analytics_actions from "../analytics/actions.js";
import type * as analytics_helpers from "../analytics/helpers.js";
import type * as analytics_mutations from "../analytics/mutations.js";
import type * as analytics_queries from "../analytics/queries.js";
import type * as analytics_types from "../analytics/types.js";
import type * as appVersion_mutations from "../appVersion/mutations.js";
import type * as appVersion_queries from "../appVersion/queries.js";
import type * as apple from "../apple.js";
import type * as applePurchases from "../applePurchases.js";
import type * as appleRootCertificates from "../appleRootCertificates.js";
import type * as article_actions from "../article/actions.js";
import type * as article_mutations from "../article/mutations.js";
import type * as article_queries from "../article/queries.js";
import type * as articleLanguage_mutations from "../articleLanguage/mutations.js";
import type * as articleLanguage_queries from "../articleLanguage/queries.js";
import type * as auth from "../auth.js";
import type * as battle_helpers from "../battle/helpers.js";
import type * as battle_logic from "../battle/logic.js";
import type * as battle_mutations from "../battle/mutations.js";
import type * as battle_queries from "../battle/queries.js";
import type * as category_queries from "../category/queries.js";
import type * as chat_actions from "../chat/actions.js";
import type * as chat_mutations from "../chat/mutations.js";
import type * as chat_queries from "../chat/queries.js";
import type * as crons from "../crons.js";
import type * as dailyChallenge_mutations from "../dailyChallenge/mutations.js";
import type * as dailyChallenge_queries from "../dailyChallenge/queries.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as feather_helpers from "../feather/helpers.js";
import type * as http from "../http.js";
import type * as iap from "../iap.js";
import type * as internals from "../internals.js";
import type * as league_mutations from "../league/mutations.js";
import type * as league_queries from "../league/queries.js";
import type * as migrations from "../migrations.js";
import type * as naverpay from "../naverpay.js";
import type * as purchase_mutations from "../purchase/mutations.js";
import type * as purchase_queries from "../purchase/queries.js";
import type * as queries from "../queries.js";
import type * as quiz_mutations from "../quiz/mutations.js";
import type * as quiz_queries from "../quiz/queries.js";
import type * as quiz_types from "../quiz/types.js";
import type * as quizLanguage_helpers from "../quizLanguage/helpers.js";
import type * as quizLanguage_mutations from "../quizLanguage/mutations.js";
import type * as quizLanguage_queries from "../quizLanguage/queries.js";
import type * as quizResult_grading from "../quizResult/grading.js";
import type * as quizResult_mutation from "../quizResult/mutation.js";
import type * as quizResult_query from "../quizResult/query.js";
import type * as quizSubmission_helpers from "../quizSubmission/helpers.js";
import type * as quizSubmission_mutations from "../quizSubmission/mutations.js";
import type * as quizSubmission_queries from "../quizSubmission/queries.js";
import type * as rank_queries from "../rank/queries.js";
import type * as referral_mutations from "../referral/mutations.js";
import type * as referral_queries from "../referral/queries.js";
import type * as reviewQueue_helpers from "../reviewQueue/helpers.js";
import type * as reviewQueue_mutations from "../reviewQueue/mutations.js";
import type * as reviewQueue_queries from "../reviewQueue/queries.js";
import type * as schema_adRewardEvents from "../schema/adRewardEvents.js";
import type * as schema_analytics from "../schema/analytics.js";
import type * as schema_appVersions from "../schema/appVersions.js";
import type * as schema_articleLanguages from "../schema/articleLanguages.js";
import type * as schema_articles from "../schema/articles.js";
import type * as schema_battles from "../schema/battles.js";
import type * as schema_categories from "../schema/categories.js";
import type * as schema_chats from "../schema/chats.js";
import type * as schema_dailyChallenges from "../schema/dailyChallenges.js";
import type * as schema_images from "../schema/images.js";
import type * as schema_leagues from "../schema/leagues.js";
import type * as schema_providers from "../schema/providers.js";
import type * as schema_purchases from "../schema/purchases.js";
import type * as schema_quizLanguages from "../schema/quizLanguages.js";
import type * as schema_quizResults from "../schema/quizResults.js";
import type * as schema_quizSubmissions from "../schema/quizSubmissions.js";
import type * as schema_quizzes from "../schema/quizzes.js";
import type * as schema_rankCategories from "../schema/rankCategories.js";
import type * as schema_ranks from "../schema/ranks.js";
import type * as schema_reviewQueue from "../schema/reviewQueue.js";
import type * as schema_userCategories from "../schema/userCategories.js";
import type * as schema_userProfiles from "../schema/userProfiles.js";
import type * as seeds from "../seeds.js";
import type * as toss from "../toss.js";
import type * as types from "../types.js";
import type * as user_mutations from "../user/mutations.js";
import type * as user_queries from "../user/queries.js";
import type * as userCategory_mutation from "../userCategory/mutation.js";
import type * as utils_emailList from "../utils/emailList.js";
import type * as utils_levelPlay from "../utils/levelPlay.js";
import type * as utils_md5 from "../utils/md5.js";
import type * as utils_resendClient from "../utils/resendClient.js";
import type * as utils_streakDate from "../utils/streakDate.js";
import type * as utils_validators from "../utils/validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  actions: typeof actions;
  adReward: typeof adReward;
  amazon: typeof amazon;
  "analytics/actions": typeof analytics_actions;
  "analytics/helpers": typeof analytics_helpers;
  "analytics/mutations": typeof analytics_mutations;
  "analytics/queries": typeof analytics_queries;
  "analytics/types": typeof analytics_types;
  "appVersion/mutations": typeof appVersion_mutations;
  "appVersion/queries": typeof appVersion_queries;
  apple: typeof apple;
  applePurchases: typeof applePurchases;
  appleRootCertificates: typeof appleRootCertificates;
  "article/actions": typeof article_actions;
  "article/mutations": typeof article_mutations;
  "article/queries": typeof article_queries;
  "articleLanguage/mutations": typeof articleLanguage_mutations;
  "articleLanguage/queries": typeof articleLanguage_queries;
  auth: typeof auth;
  "battle/helpers": typeof battle_helpers;
  "battle/logic": typeof battle_logic;
  "battle/mutations": typeof battle_mutations;
  "battle/queries": typeof battle_queries;
  "category/queries": typeof category_queries;
  "chat/actions": typeof chat_actions;
  "chat/mutations": typeof chat_mutations;
  "chat/queries": typeof chat_queries;
  crons: typeof crons;
  "dailyChallenge/mutations": typeof dailyChallenge_mutations;
  "dailyChallenge/queries": typeof dailyChallenge_queries;
  emailTemplates: typeof emailTemplates;
  "feather/helpers": typeof feather_helpers;
  http: typeof http;
  iap: typeof iap;
  internals: typeof internals;
  "league/mutations": typeof league_mutations;
  "league/queries": typeof league_queries;
  migrations: typeof migrations;
  naverpay: typeof naverpay;
  "purchase/mutations": typeof purchase_mutations;
  "purchase/queries": typeof purchase_queries;
  queries: typeof queries;
  "quiz/mutations": typeof quiz_mutations;
  "quiz/queries": typeof quiz_queries;
  "quiz/types": typeof quiz_types;
  "quizLanguage/helpers": typeof quizLanguage_helpers;
  "quizLanguage/mutations": typeof quizLanguage_mutations;
  "quizLanguage/queries": typeof quizLanguage_queries;
  "quizResult/grading": typeof quizResult_grading;
  "quizResult/mutation": typeof quizResult_mutation;
  "quizResult/query": typeof quizResult_query;
  "quizSubmission/helpers": typeof quizSubmission_helpers;
  "quizSubmission/mutations": typeof quizSubmission_mutations;
  "quizSubmission/queries": typeof quizSubmission_queries;
  "rank/queries": typeof rank_queries;
  "referral/mutations": typeof referral_mutations;
  "referral/queries": typeof referral_queries;
  "reviewQueue/helpers": typeof reviewQueue_helpers;
  "reviewQueue/mutations": typeof reviewQueue_mutations;
  "reviewQueue/queries": typeof reviewQueue_queries;
  "schema/adRewardEvents": typeof schema_adRewardEvents;
  "schema/analytics": typeof schema_analytics;
  "schema/appVersions": typeof schema_appVersions;
  "schema/articleLanguages": typeof schema_articleLanguages;
  "schema/articles": typeof schema_articles;
  "schema/battles": typeof schema_battles;
  "schema/categories": typeof schema_categories;
  "schema/chats": typeof schema_chats;
  "schema/dailyChallenges": typeof schema_dailyChallenges;
  "schema/images": typeof schema_images;
  "schema/leagues": typeof schema_leagues;
  "schema/providers": typeof schema_providers;
  "schema/purchases": typeof schema_purchases;
  "schema/quizLanguages": typeof schema_quizLanguages;
  "schema/quizResults": typeof schema_quizResults;
  "schema/quizSubmissions": typeof schema_quizSubmissions;
  "schema/quizzes": typeof schema_quizzes;
  "schema/rankCategories": typeof schema_rankCategories;
  "schema/ranks": typeof schema_ranks;
  "schema/reviewQueue": typeof schema_reviewQueue;
  "schema/userCategories": typeof schema_userCategories;
  "schema/userProfiles": typeof schema_userProfiles;
  seeds: typeof seeds;
  toss: typeof toss;
  types: typeof types;
  "user/mutations": typeof user_mutations;
  "user/queries": typeof user_queries;
  "userCategory/mutation": typeof userCategory_mutation;
  "utils/emailList": typeof utils_emailList;
  "utils/levelPlay": typeof utils_levelPlay;
  "utils/md5": typeof utils_md5;
  "utils/resendClient": typeof utils_resendClient;
  "utils/streakDate": typeof utils_streakDate;
  "utils/validators": typeof utils_validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
