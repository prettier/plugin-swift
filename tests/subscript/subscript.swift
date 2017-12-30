class Basket {
    subscript(name: String) -> Int {
        return fruits[name]
    }

    subscript(name: String) -> Int {
        get {
            return fruits[name]
        }
        set(newValue) {
            fruits[name] = newValue
        }
    }
}
