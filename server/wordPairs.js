// Each pair: crew word + a similar-but-different imposter word.
// Close enough that the imposter's drawing can plausibly pass, different
// enough that careful discussion can expose it.
export const WORD_PAIRS = [
  ['Pizza', 'Pancake'],
  ['Lion', 'Tiger'],
  ['Guitar', 'Violin'],
  ['Beach', 'Desert'],
  ['Castle', 'Sandcastle'],
  ['Astronaut', 'Diver'],
  ['Volcano', 'Mountain'],
  ['Robot', 'Toaster'],
  ['Butterfly', 'Moth'],
  ['Pirate', 'Sailor'],
  ['Snowman', 'Scarecrow'],
  ['Octopus', 'Squid'],
  ['Wizard', 'Witch'],
  ['Skateboard', 'Surfboard'],
  ['Campfire', 'Fireplace'],
  ['Dragon', 'Dinosaur'],
  ['Cactus', 'Christmas Tree'],
  ['Submarine', 'Ship'],
  ['Ninja', 'Samurai'],
  ['Igloo', 'Tent'],
  ['Peacock', 'Flamingo'],
  ['Waterfall', 'River'],
  ['Rollercoaster', 'Ferris Wheel'],
  ['Beehive', 'Anthill'],
  ['Lighthouse', 'Windmill'],
  ['Mermaid', 'Fairy'],
  ['Spider', 'Crab'],
  ['Rainbow', 'Aurora'],
  ['Tornado', 'Hurricane'],
  ['Compass', 'Clock'],
];

export function randomWordPair() {
  return WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
}
