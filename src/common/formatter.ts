export const MobileFormat = (mobile: string) => {
  return mobile.startsWith('+') ? mobile : `+976${mobile}`;
};

export const MobileParser = (mobile: string) => {
  return mobile ? mobile.replace('+976', '') : '';
};
