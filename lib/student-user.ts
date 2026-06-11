type StudentIdentityInput = {
  firstName: string;
  surname: string;
  mobile: string;
  email: string;
  passwordHash?: string;
};

export async function upsertStudentIdentity(transaction: any, input: StudentIdentityInput) {
  const firstName = input.firstName.trim();
  const surname = input.surname.trim();
  const mobile = input.mobile.trim();
  const email = input.email.trim().toLowerCase();

  const existingByEmail = email ? await transaction.user.findUnique({ where: { email } }) : null;
  const existingByMobile = mobile ? await transaction.user.findUnique({ where: { mobile } }) : null;

  if (existingByEmail) {
    const data: Record<string, string> = {
      firstName,
      surname,
      role: "STUDENT"
    };

    if (input.passwordHash) {
      (data as Record<string, string | undefined>).passwordHash = input.passwordHash;
    }

    if (!existingByMobile || existingByMobile.id === existingByEmail.id) {
      data.mobile = mobile;
    }

    return transaction.user.update({
      where: { id: existingByEmail.id },
      data: {
        ...data,
        email
      }
    });
  }

  if (existingByMobile) {
    const data: Record<string, string> = {
      firstName,
      surname,
      role: "STUDENT"
    };

    if (input.passwordHash) {
      (data as Record<string, string | undefined>).passwordHash = input.passwordHash;
    }

    if (!existingByEmail || existingByEmail.id === existingByMobile.id) {
      data.email = email;
    }

    return transaction.user.update({
      where: { id: existingByMobile.id },
      data: {
        ...data,
        mobile
      }
    });
  }

  return transaction.user.create({
    data: {
      firstName,
      surname,
      mobile,
      email,
      ...(input.passwordHash ? { passwordHash: input.passwordHash } : {}),
      role: "STUDENT"
    }
  });
}
