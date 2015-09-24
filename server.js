import express from 'express';
import wizard from './index';

const options = {
  sources: {
    images: {
      type: 's3',
      region: process.env.AWS_DEFAULT_REGION,
      bucket: 'images.unfold.no',
    },
    bar: {
      type: 's3',
      region: process.env.AWS_DEFAULT_REGION,
      bucket: 'bar.unfold.no',
    },
  },
};

const server = express();
server.use(wizard(options));
server.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  res.statusCode = err.statusCode || statusCode;
  res.json({message: err.message, statusCode: res.statusCode});
});

server.listen(process.env.PORT || 3000);
