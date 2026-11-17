import {t} from '../STRINGS';

/**
 * Categories Localization Map
 *
 * @see /convex/schema.ts - Database schema
 * @see /convex/functions.ts - Initial data
 *
 * This map connects category names from the database with their localized strings.
 * The 'name' field must match exactly with the 'name' in the database.
 */
export interface Category {
  name: string;
  localizedString: string;
}

export const categoriesMap: Category[] = [
  {name: 'BASIC_SCIENCE', localizedString: t('categoriesMap.basicScience')},
  {
    name: 'DIGITAL_LITERACY',
    localizedString: t('categoriesMap.digitalLiteracy'),
  },
  {
    name: 'ECONOMY_AND_FINANCE',
    localizedString: t('categoriesMap.economyAndFinance'),
  },
  {
    name: 'FIRST_AID_AND_SAFETY',
    localizedString: t('categoriesMap.firstAidAndSafety'),
  },
  {
    name: 'GENERAL_KNOWLEDGE',
    localizedString: t('categoriesMap.generalKnowledge'),
  },
  {
    name: 'GEOGRAPHY_AND_CULTURE',
    localizedString: t('categoriesMap.geographyAndCulture'),
  },
  {name: 'LAW_AND_RIGHTS', localizedString: t('categoriesMap.lawAndRights')},
  {name: 'LIFE_HACKS', localizedString: t('categoriesMap.lifeHacks')},
  {name: 'POP_CULTURE', localizedString: t('categoriesMap.popCulture')},
  {name: 'WORLD_HISTORY', localizedString: t('categoriesMap.worldHistory')},
  {name: 'HEALTH_AND_NUTRITION', localizedString: t('categoriesMap.healthAndNutrition')},
  {name: 'PSYCHOLOGY', localizedString: t('categoriesMap.psychology')},
  {name: 'ENVIRONMENT_AND_CLIMATE', localizedString: t('categoriesMap.environmentAndClimate')},
  {name: 'TECHNOLOGY_AND_AI', localizedString: t('categoriesMap.technologyAndAi')},
  {name: 'FOOD_AND_COOKING', localizedString: t('categoriesMap.foodAndCooking')},
  {name: 'SPORTS', localizedString: t('categoriesMap.sports')},
  {name: 'SPACE_AND_ASTRONOMY', localizedString: t('categoriesMap.spaceAndAstronomy')},
  {name: 'ANIMALS_AND_NATURE', localizedString: t('categoriesMap.animalsAndNature')},
  {name: 'ART_AND_MUSIC', localizedString: t('categoriesMap.artAndMusic')},
  {name: 'LANGUAGE_AND_COMMUNICATION', localizedString: t('categoriesMap.languageAndCommunication')},
];
