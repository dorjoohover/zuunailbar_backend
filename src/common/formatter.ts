// Утасны дугаарыг цэвэрлэж, нэг стандарт хэлбэрт (+976XXXXXXXX) оруулна.
// Хоосон зай, зураас, хаалт, тэг угтвар зэргийг арилгана.
//
// Зорилго 1: ижил хүний дугаар өөр өөр форматаар орж ирсэн ч (жишээ нь
// админ "9911 2233" гэж бичсэн, хэрэглэгч "099112233" гэж бүртгүүлсэн)
// нэг л мөр болж, давхар хэрэглэгчийн бүртгэл (customer_id) үүсэхээс сэргийлнэ.
//
// Зорилго 2: excel-ээс захиалга импортлох үед нэг нүдэнд таслалаар (,)
// тусгаарлагдсан хэд хэдэн дугаар орж ирвэл (жишээ нь "97680652627,80652526"
// — анх буруу бичээд, дараа нь зөв дугаараа нэмж бичсэн тохиолдол) хоёр
// дугаарыг хамтад нь нааж гажуудуулахгүй, ХАМГИЙН СҮҮЛИЙН дугаарыг эцсийн
// (зөв) дугаар гэж үзнэ. Энэ бол production дата дээр олдсон бодит алдаа —
// "+97680652627,80652526" гэсэн гажуудсан дугаартай хэрэглэгч давхар үүссэн
// шалтгаан байсан.
export const MobileFormat = (mobile: string) => {
  if (mobile == null) return mobile;

  const raw = String(mobile).trim();
  if (!raw) return raw;

  // Нэг талбарт олон дугаар (таслалаар тусгаарлагдсан) орсон бол сүүлийнхийг нь авна
  const segments = raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const candidate = segments.length ? segments[segments.length - 1] : raw;

  let phone = candidate.replace(/[\s\-()]/g, '');
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

// Хэрэглэгчийн нэр (nickname/firstname/lastname) талбарт trim хийж,
// үсэг/зай/зураас/апострофоос бусад тэмдэгтийг (тоо, тусгай тэмдэгт г.м.)
// цэвэрлэж, дараалсан олон зайг нэг зай болгож нэгтгэнэ. Frontend талд ижил
// цэвэрлэгээ хийдэг ч API-г шууд дуудсан (жишээ нь chatbot endpoint)
// тохиолдолд ч мөн хамгаалалттай байлгах зорилготой.
export const sanitizeName = (value?: string | null) => {
  if (value == null) return value;

  return String(value)
    .replace(/[^\p{L}\s\-']/gu, '')
    .trim()
    .replace(/\s+/g, ' ');
};

export const MobileParser = (mobile: string) => {
  if (!mobile) return '';
  return String(mobile)
    .trim()
    .split(/[,;]+/)
    .pop()!
    .replace(/[\s\-()]/g, '')
    .replace(/^\+?976/, '');
};
