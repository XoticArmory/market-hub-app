import assert from "node:assert/strict";
import test from "node:test";
import { matchesEventSearch } from "./event-search.ts";

test("matches event name, venue/location, city and description", () => {
  const event = {
    title: "Autumn Makers Market",
    location: "Community Hall, 12 Oak Street",
    description: "Handmade pottery and local food.",
  };
  assert.ok(matchesEventSearch(event, "MAKERS"));
  assert.ok(matchesEventSearch(event, "community hall"));
  assert.ok(matchesEventSearch(event, "fort collins", "Fort Collins"));
  assert.ok(matchesEventSearch(event, "pottery"));
  assert.ok(matchesEventSearch(event, "market collins pottery", "Fort Collins"));
  assert.equal(matchesEventSearch(event, "market jewelry", "Fort Collins"), false);
  assert.ok(matchesEventSearch({ name: "Fair", venue: "Arena", city: "Denver" }, "fair arena denver"));
});

test("blank searches, missing fields and accented text are safe", () => {
  assert.ok(matchesEventSearch({}, "  "));
  assert.equal(matchesEventSearch({ description: null }, "pottery"), false);
  assert.ok(matchesEventSearch({ title: "Café Bazaar" }, " cafe   BAZAAR "));
  assert.equal(matchesEventSearch({ title: "Craft Market" }, "[.*]"), false);
});

test("keyword filtering composes with location filters and preserves ordering", () => {
  const events = [
    { id: 3, title: "Pottery Fair", city: "Denver", state: "CO", inRadius: true },
    { id: 2, title: "Craft Market", city: "Denver", state: "CO", inRadius: true },
    { id: 1, title: "Pottery Expo", city: "Cheyenne", state: "WY", inRadius: true },
    { id: 4, title: "Pottery Day", city: "Denver", state: "CO", inRadius: false },
  ];
  const locationFiltered = events.filter(e => e.state === "CO" && e.inRadius);
  assert.deepEqual(locationFiltered.filter(e => matchesEventSearch(e, "pottery")).map(e => e.id), [3]);
  assert.deepEqual(locationFiltered.filter(e => matchesEventSearch(e, "")).map(e => e.id), [3, 2]);
});
