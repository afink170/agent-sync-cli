/**
 * @type {import('lint-staged').Configuration}
 */
export default {
  '!(*.ts|*.js)': ['prettier --ignore-unknown --write'],
  '*.{js,ts}': [() => 'tsc --noEmit', 'eslint --fix', 'prettier --write'],
};
