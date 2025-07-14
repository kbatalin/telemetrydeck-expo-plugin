module.exports = {
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '100',
  supportedCpuArchitectures: ['arm64'],
  modelName: 'iPhone',
  osName: 'iOS',
  osVersion: '17.0',
  brand: 'Apple',
  getLocales: () => [{ languageTag: 'en-US', regionCode: 'US' }],
  getCalendars: () => [{ timeZone: 'UTC' }],
}; 