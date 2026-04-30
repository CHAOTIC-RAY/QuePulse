# Security Specification - Hospitrack

## Data Invariants
1. **Queue Authority:** Only verified staff can increment the `currentNumber` or change queue status.
2. **Token Integrity:** Once a token is issued (`waiting`), its `issuedAt` and `number` fields are immutable.
3. **Status Transitions:** Tokens move strictly from `waiting` -> `calling` -> `completed` or `skipped`.
4. **Relational Sync:** Every token write must verify the existence of its parent `/queues/{queueId}` document.
5. **Ownership:** Patients can only read their own private data if it exists, but the public board only allows viewing anonymized status.

## The Dirty Dozen Payloads (Targeting PERMISSION_DENIED)

1. **Identity Spoofing:** Create a queue as an unauthenticated user.
2. **Resource Poisoning:** Update `counterInfo` with a 2MB string.
3. **ID Injection:** Create a queue with an ID containing shell characters `../../../etc/passwd`.
4. **State Shortcutting:** Directly set a new token's status to `completed` bypassing `waiting`.
5. **Unauthorized Promotion:** A non-staff user updating the `currentNumber` of a queue.
6. **Immutable Violation:** Attempting to change `prefix` on an existing queue.
7. **Temporal Fraud:** Setting `lastUpdated` to a date in 2030 (client-side timestamp choice).
8. **Orphaned Writes:** Creating a token for a `queueId` that does not exist.
9. **Role Escalation:** Trying to create an Admin record in a restricted `/admins/` collection.
10. **Shadow Field Attack:** Adding `isVerified: true` to a Token document.
11. **Negative Counters:** Setting `currentNumber` to `-1`.
12. **Blanket Read Attack:** Trying to `list` tokens without specifying a `queueId` or owner filter.

## Test Runner (firestore.rules.test.ts)
*Note: This is a conceptual representation of the test suite required.*

```typescript
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

// ... setup ...

it('should deny unauthenticated queue creation', async () => {
    const db = getUnauthedDb();
    await assertFails(db.collection('queues').add({ name: 'Hack Clinic' }));
});

it('should deny staff updates from unverified emails', async () => {
    const db = getAuthedDb({ uid: 'user1', email_verified: false });
    await assertFails(db.collection('queues').doc('q1').update({ currentNumber: 5 }));
});

it('should deny oversized strings in counterInfo', async () => {
    const db = getStaffDb();
    const giantString = 'a'.repeat(2000);
    await assertFails(db.collection('queues').doc('q1').update({ counterInfo: giantString }));
});
```
