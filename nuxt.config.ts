// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  typescript: {
    typeCheck: true,
    strict: true,
  },
  css: ['~/assets/scss/main.scss'],
  app: {
    head: {
      title: 'Заметки',
      htmlAttrs: { lang: 'ru' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Приложение для заметок' },
      ],
    },
  },
});
