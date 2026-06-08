import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const docsSiteUrl = process.env.DOCS_SITE_URL ?? 'https://docs.opensoha.dev';
const docsBaseUrl = process.env.DOCS_BASE_URL ?? '/docs/';
const showDocsLastUpdateTime = process.env.DOCS_SHOW_LAST_UPDATE_TIME === 'true';
const cloudLoginUrl = process.env.SOHA_CLOUD_LOGIN_URL;
const cloudLoginNavbarItems = cloudLoginUrl
  ? [
      {
        label: 'Cloud 登录',
        href: cloudLoginUrl,
        position: 'right' as const,
      },
    ]
  : [];

const config: Config = {
  title: 'OpenSoha',
  tagline: 'Soha open-source control plane and Soha Cloud entry',
  favicon: 'logo.svg',
  future: {
    v4: true,
  },
  customFields: {
    cloudLoginUrl: cloudLoginUrl ?? '',
  },
  url: docsSiteUrl,
  baseUrl: docsBaseUrl,
  trailingSlash: true,
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },
  staticDirectories: ['public'],
  presets: [
    [
      'classic',
      {
        docs: {
          path: '.',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          include: ['**/*.{md,mdx}'],
          exclude: [
            'en/**',
            'README.md',
            '.vitepress/**',
            'node_modules/**',
            'build/**',
            'src/**',
            'static/**',
          ],
          showLastUpdateTime: showDocsLastUpdateTime,
          editUrl: 'https://github.com/opensoha/soha-docs/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    image: 'logo.svg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'OpenSoha',
      hideOnScroll: true,
      logo: {
        alt: 'Soha logo',
        src: 'logo.svg',
      },
      items: [
        {
          type: 'doc',
          docId: 'index',
          label: '首页',
          position: 'left',
        },
        {
          type: 'doc',
          docId: 'self-hosted/index',
          label: '自托管',
          position: 'left',
        },
        {
          type: 'doc',
          docId: 'cloud/index',
          label: 'Soha Cloud',
          position: 'left',
        },
        {
          type: 'doc',
          docId: 'marketplace/index',
          label: '市场',
          position: 'left',
        },
        {
          type: 'doc',
          docId: 'api/contracts',
          label: 'API',
          position: 'left',
        },
        {
          href: 'https://github.com/opensoha/soha',
          label: 'GitHub',
          position: 'right',
        },
        ...cloudLoginNavbarItems,
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            {label: '架构', to: '/architecture/'},
            {label: '开发', to: '/development/local-development'},
            {label: 'API', to: '/api/overview'},
            {label: '运维', to: '/operations/configuration'},
          ],
        },
      ],
      copyright: '© 2026 Soha 版权所有，由项目贡献者设计与开发。',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
