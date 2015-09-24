import test from 'tape';
import express from 'express';
import request from 'supertest';
import wizard from '../';

Error.stackTraceLimit = Infinity;

const options = {
  sources: {
    valid: {
      type: 's3',
      region: process.env.AWS_DEFAULT_REGION,
      bucket: 'images.unfold.no',
    },
    invalid_region: {
      type: 's3',
      region: 'eu-central-1',
      bucket: 'images.unfold.no',
    },
    invalid_bucket: {
      type: 's3',
      region: process.env.AWS_DEFAULT_REGION,
      bucket: 'bar.unfold.no',
    },
  },
};

const app = express();
app.use(wizard(options));
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.statusCode) {
    res.statusCode = err.statusCode;
  }

  res.json({message: err.message, statusCode: res.statusCode});
});

test('Should fail when source is invalid', assert => {
  request(app)
    .get('/foo/girl.jpg/resize:,600')
    .expect(404)
    .expect(/source not found/i)
    .end(err => {
      assert.error(err);
      assert.end();
    });
});

test('Should fail when S3 source region is invalid', assert => {
  request(app)
    .get('/invalid_region/girl.jpg/resize:,600')
    .expect(301)
    .end(err => {
      assert.error(err);
      assert.end();
    });
});

test('Should fail when S3 bucket is invalid', assert => {
  request(app)
    .get('/invalid_bucket/girl.jpg/resize:,600')
    .expect(404)
    .end(err => {
      assert.error(err);
      assert.end();
    });
});

test('Should fail when S3 object does not exist', assert => {
  request(app)
    .get('/valid/boy.jpg/resize:,600')
    .expect(404)
    .end(err => {
      assert.error(err);
      assert.end();
    });
});

test('Should resize image', assert => {
  request(app)
    .get('/valid/girl.jpg/resize:,600')
    .expect(200)
    .expect('Content-Type', 'image/jpeg')
    .end(err => {
      assert.error(err);
      assert.end();
    });
});



test('Should pass through if no transforms are specified', assert => {
  request(app)
    .get('/valid/fjord.jpg')
    .expect(200)
    .expect('Content-Type', 'image/jpeg')
    .end(err => {
      assert.error(err);
      assert.end();
    });
});
