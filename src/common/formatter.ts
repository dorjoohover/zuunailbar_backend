// Утасны дугаарыг цэвэрлэж, нэг стандарт хэлбэрт (+976XXXXXXXX) оруулна.
// Хоосон зай, зураас, хаалт, тэг угтвар зэргийг арилгана.
// Зорилго: ижил хүний дугаар өөр өөр форматаар орж ирсэн ч (жишээ нь
// админ "9911 2233" гэж бичсэн, хэрэглэгч "099112233" гэж бүртгүүлсэн)
// нэг л мөр болж, давхар хэрэглэгчийн бүртгэл (customer_id) үүсэхээс сэргийлнэ.
export const MobileFormat = (mobile: string) => {
  if (mobile == null) return mobile;

  let phone = String(mobile).trim().replace(/[\s\-()]/g, '');
  if (!phone) return phone;

  // "00976..." олон улсын дуудлагын угтвар
  if (phone.startsWith('00')) {
    phone = `+${phone.slice(2)}`;
  }

  if (phone.startsWith('+')) {
    return phone;
  }

  // "976..." (+ дутуу)
  if (phone.startsWith('976') && phone.length > 8) {
    return `+${phone}`;
  }

  // Дотоодын дугаарын "0" угтвар (жишээ: 099112233)
  if (phone.startsWith('0')) {
    phone = phone.slice(1);
  }

  return `+976${phone}`;
};

export const MobileParser = (mobile: string) => {
  if (!mobile) return '';
  return String(mobile)
    .trim()
    .replace(/[\s\-()]/g, '')
    .replace(/^\+?976/, '');
};
