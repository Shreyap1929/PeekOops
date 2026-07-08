const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generateRoomCode(existingCodes) {
  let code;
  do {
    code = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
  } while (existingCodes.has(code));
  return code;
}
