export const toBoliviaTime = (date?: Date | string): Date => {
    if (!date) return new Date(new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" }));
    return new Date(new Date(date).toLocaleString("en-US", { timeZone: "America/La_Paz" }));
}