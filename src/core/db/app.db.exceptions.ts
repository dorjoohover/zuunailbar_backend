export class AppDBResultNotFoundException extends Error {
    constructor(m: string) {
        super(m);
        Object.setPrototypeOf(this, AppDBResultNotFoundException.prototype);
    }
}

export class AppDBTooManyResultException extends Error {
    constructor(m: string) {
        super(m);
        Object.setPrototypeOf(this, AppDBTooManyResultException.prototype);
    }
}

export class AppDBInvalidDataException extends Error {
    constructor(m: string) {
        super(m);
        Object.setPrototypeOf(this, AppDBInvalidDataException.prototype);
    }
}

export class AppDBException extends Error {
    constructor(m: string) {
        super(m);
        Object.setPrototypeOf(this, AppDBException.prototype);
    }
}