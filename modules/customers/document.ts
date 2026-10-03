export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (base: string, factor: number) => {
    const total = base.split("").reduce((sum, char) => sum + Number(char) * factor--, 0);
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return digit(cpf.slice(0, 9), 10) === Number(cpf[9]) && digit(cpf.slice(0, 10), 11) === Number(cpf[10]);
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

export function isValidDocument(value: string) {
  const digits = onlyDigits(value);
  return isValidCpf(digits) || isValidCnpj(digits);
}

export function maskDocument(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function formatDocument(value: string) {
  const digits = onlyDigits(value);
  if (digits.length === 11 || digits.length === 14) return maskDocument(digits);
  return value;
}

export function formatCpf(value: string) {
  return formatDocument(value);
}

export function formatPhone(phone: string | null) {
  if (!phone) return null;
  if (phone.length === 11) return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (phone.length === 10) return phone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return phone;
}
