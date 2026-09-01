// Centralized pricing constants
export const PRICING = {
  regular: 10000,
  foundingMember: 5000,
};

// Numeric values for value math (labels live in commerce.json)
export const VALUE_MATH_VALUES = [1000, 2100, 24000, 2800, 5000, 17600] as const;

export const TOTAL_VALUE = VALUE_MATH_VALUES.reduce((sum, value) => sum + value, 0);

// Video reviews from Bunny Stream
export const VIDEO_REVIEWS = [
  'https://iframe.mediadelivery.net/play/465597/e3fcc1e6-b848-4850-b418-18a4d556ae5e',
  'https://iframe.mediadelivery.net/play/465597/b9a6f7f9-3cf4-4375-80d8-189df32e857f',
  'https://iframe.mediadelivery.net/play/465597/c6f7a2f8-a193-4c80-93bf-adc581dc694d',
  'https://iframe.mediadelivery.net/play/465597/7f908cb7-4049-4d5c-ba0b-e8c296939937',
  'https://iframe.mediadelivery.net/play/465597/a47eeacf-2395-479e-9442-b713e3fd0784',
  'https://iframe.mediadelivery.net/play/465597/c4dfb79e-f21f-4985-875c-c1a553919b3a',
  'https://iframe.mediadelivery.net/play/465597/ee797560-72bb-4293-8eb1-e17425615bed',
  'https://iframe.mediadelivery.net/play/465597/c57caa71-4089-4689-862b-0786136c0fae',
  'https://iframe.mediadelivery.net/play/465597/1d1f3b59-4859-40d4-9e10-160091424a86',
  'https://iframe.mediadelivery.net/play/465597/d871c94b-0a93-4004-8bd5-64b36cfbbc7e',
  'https://iframe.mediadelivery.net/play/465597/dcdcdeed-4578-47dd-a63b-87262a2eb786',
];

// Non-translatable subscribe route constants
export const SUBSCRIBE_SIGNUP_HREF = '/signup';
