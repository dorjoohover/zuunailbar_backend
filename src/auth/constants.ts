export const jwtConstants = {
  // Хуучин код-т hardcode хийсэн 'secretKey' утгыг ENV-рүү шилжүүлсэн.
  // Docker/production дээр JWT_SECRET-ийг заавал тохируулна (.env.example үзнэ үү).
  secret: process.env.JWT_SECRET ?? 'secretKey',
};
