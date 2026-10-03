export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCnpj(cnpj: string) {
  if (!/^\d{14}$/.test(cnpj)) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const digit = (base: string) => {
    let factor = base.length - 7;
    const total = base.split("").reduce((sum, char) => {
      const next = sum + Number(char) * factor;
      factor = factor === 2 ? 9 : factor - 1;
      return next;
    }, 0);
    const rest = total % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return digit(cnpj.slice(0, 12)) === Number(cnpj[12]) && digit(cnpj.slice(0, 13)) === Number(cnpj[13]);
}

export function formatCnpj(cnpj: string) {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14) return cnpj;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export function formatPhone(phone: string | null) {
  if (!phone) return null;
  if (phone.length === 11) return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (phone.length === 10) return phone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return phone;
}
