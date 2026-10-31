import assert from 'node:assert/strict';
import test from 'node:test';
import type { Queue, UserTracking } from '../types.ts';
import { checkTrackingAlert } from './trackingStatus.ts';
import { queuesFromResponse } from '../services/queueService.ts';

const tracking: UserTracking = {
  source: 'hmh',
  queueId: 'room-1',
  myToken: '10',
  notifyThreshold: 2,
};

function queue(currentNumber: string, id = 'room-1'): Queue {
  return {
    id,
    name: 'ROOM 1',
    prefix: '',
    currentNumber,
    counterInfo: 'Room 1',
  };
}

test('failed scrape with an empty queues array is an error', () => {
  assert.throws(
    () => queuesFromResponse(false, 502, { error: 'Failed to scrape HMH queues', queues: [] }),
    /Failed to scrape HMH queues/
  );
});

test('successful queue array is returned', () => {
  const rows = queuesFromResponse(true, 200, [queue('8')]);
  assert.equal(rows[0].currentNumber, '8');
});

test('successful wrapped queues are returned', () => {
  const rows = queuesFromResponse(true, 200, { queues: [queue('4')] });
  assert.equal(rows.length, 1);
});

test('alert fires inside the threshold and does not repeat for the same number', () => {
  const first = checkTrackingAlert(tracking, [queue('8')], null);
  assert.ok(first);
  assert.equal(first.title, 'Your turn is near!');
  assert.equal(checkTrackingAlert(tracking, [queue('8')], first.alertId), null);
});

test('alert does not fire when the token is still far away', () => {
  assert.equal(checkTrackingAlert(tracking, [queue('1')], null), null);
});

test('a jump past the token alerts once', () => {
  const hit = checkTrackingAlert(tracking, [queue('14')], null);
  assert.ok(hit);
  assert.equal(hit.title, 'Your token was called');
  assert.match(hit.body, /has been reached/);
  assert.equal(checkTrackingAlert(tracking, [queue('15')], hit.alertId), null);
});

test('the next serving number inside the threshold alerts again', () => {
  const first = checkTrackingAlert(tracking, [queue('8')], null);
  assert.ok(first);
  const next = checkTrackingAlert(tracking, [queue('9')], first.alertId);
  assert.ok(next);
  assert.notEqual(next.alertId, first.alertId);
});
