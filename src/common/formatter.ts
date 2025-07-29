export const MobileFormat = (mobile: string) => {
  return mobile.startsWith('+') ? mobile : `+976${mobile}`;
};
