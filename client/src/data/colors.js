export const ACCENTS = {
  coral: { tint: '#FDE9E7', soft: '#FDB8B2', base: '#FF6B5E', shade: '#E85647' },
  sky: { tint: '#E7EFFD', soft: '#A0C2FD', base: '#4C8DFF', shade: '#3169D6' },
  sage: { tint: '#DCEFE5', soft: '#7CCCAE', base: '#3FB88A', shade: '#247758' },
  sunshine: { tint: '#FDF6E7', soft: '#FDDF9F', base: '#FFC64B', shade: '#EEA300' },
  lilac: { tint: '#EDE9FB', soft: '#DBD4FA', base: '#9B87F5', shade: '#7259E8' },
};

export function accentBase(colorKey) {
  return ACCENTS[colorKey]?.base || '#2B2A28';
}
