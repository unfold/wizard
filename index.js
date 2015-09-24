import {S3} from 'aws-sdk';
import gm from 'gm';

/*
  TODO:
  - Generate input filename using Content-Type headers
  - Add more source types (http, fs)
*/

const FORWARD_HEADERS = ['content-type', 'etag', 'last-modified'];

function parseTransform(transform) {
  const [method, args] = transform.split(':');

  return {
    method,
    args: args ? args.split(',').filter(Boolean) : [],
  };
}

function parseUrl(url) {
  const segments = url.split('/').filter(Boolean);
  const source = segments[0];
  const transformsIndex = segments.slice(1).findIndex(segment => segment.indexOf(':') > -1) + 1;
  const transforms = transformsIndex ? segments.slice(transformsIndex).map(parseTransform) : null;
  const paths = transforms ? segments.slice(1, transformsIndex) : segments.slice(1);
  const path = paths.join('/');
  const filename = paths[paths.length - 1];
  const [basename, extension] = filename.split('.');

  return {
    source,
    transforms,
    path,
    filename,
    basename,
    extension,
  };
}

// gm(stream, filename).resize(...).crop(...)
function applyTransforms(transformer, transforms) {
  return transforms.reduce((target, {method, args}) => {
    return target[method].apply(target, args);
  }, transformer);
}

export default function wizard(options = {}) {
  return function middleware(req, res, next) {
    const params = parseUrl(req.url);
    const source = options.sources[params.source];

    if (!source) {
      res.statusCode = 404;

      return next(new Error('Source not found'));
    }

    const s3 = new S3(source);
    const input = s3.getObject({Bucket: source.bucket, Key: params.path});
    const stream = input.createReadStream().on('error', next);

    input.on('httpHeaders', (statusCode, headers) => {
      if (statusCode !== 200) {
        return;
      }

      FORWARD_HEADERS.forEach(name => {
        const value = headers[name];

        if (value) {
          res.setHeader(name, value);
        }
      });

      if (!params.transforms) {
        stream.pipe(res);
        return;
      }

      applyTransforms(gm(stream), params.transforms)
        .noProfile()
        .stream()
        .on('error', next)
        .pipe(res);
    });
  };
}
