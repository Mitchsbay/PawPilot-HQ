import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-restricted-syntax': [
        'error',
        { 'selector': 'Literal[value="pet-photos"]', 'message': 'Use BUCKETS.petPhotos instead of hardcoded bucket name' },
        { 'selector': 'Literal[value="post-media"]', 'message': 'Use BUCKETS.postMedia instead of hardcoded bucket name' },
        { 'selector': 'Literal[value="group-avatars"]', 'message': 'Use BUCKETS.groupAvatars instead of hardcoded bucket name' },
        { 'selector': 'Literal[value="album-photos"]', 'message': 'Use BUCKETS.albumPhotos instead of hardcoded bucket name' },
        { 'selector': 'Literal[value="lost-found-photos"]', 'message': 'Use BUCKETS.lostFoundPhotos instead of hardcoded bucket name' },
        { 'selector': 'Literal[value="reel-videos"]', 'message': 'Use BUCKETS.reelVideos instead of hardcoded bucket name' },
        { 'selector': 'Literal[value="cause-images"]', 'message': 'Use BUCKETS.causeImages instead of hardcoded bucket name' },
        { 'selector': 'Literal[value="health-attachments"]', 'message': 'Use BUCKETS.healthAttachments instead of hardcoded bucket name' }
      ],
    },
  }
);
