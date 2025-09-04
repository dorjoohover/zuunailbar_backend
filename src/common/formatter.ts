export const MobileFormat = (mobile: string) => {
  const phone = String(mobile);
  return phone.startsWith('+') ? phone : `+976${phone}`;
};

export const MobileParser = (mobile: string) => {
  return mobile ? mobile.replace('+976', '') : '';
};

