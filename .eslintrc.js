module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['backend/**/*.ts'],
      env: {
        node: true,
      },
    },
  ],
};
