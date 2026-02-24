const path = require('path');
const fs = require('fs');

const PRISMA_IMPORT_META_URL_SHIM =
  "(module.require('url').pathToFileURL(typeof __filename !== 'undefined' ? __filename : process.cwd()).toString())";

module.exports = (_serverless) => ({
  alias: {
    '@pris': path.resolve(__dirname, 'prisma'),
    '@': path.resolve(__dirname, 'src'),
  },
  external: [
    'class-transformer/storage',
    '@nestjs/websockets/socket-module',
    '@nestjs/websockets',
    '@nestjs/microservices/microservices-module',
    '@nestjs/microservices',
    '@nestjs/swagger',
    'swagger-ui-dist',
    'swagger-ui-express',
  ],
  plugins: [
    {
      name: 'prisma-import-meta-url-shim',
      setup(build) {
        build.onLoad(
          { filter: /[\\/]@prisma[\\/]client[\\/]runtime[\\/].*\.mjs$/ },
          (args) => {
            let contents = fs.readFileSync(args.path, 'utf8');
            contents = contents.replace(
              /import\.meta\.url/g,
              PRISMA_IMPORT_META_URL_SHIM,
            );
            return { contents, loader: 'js' };
          },
        );
      },
    },
  ],
});
