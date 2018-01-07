enum Edible {
    case apple
    case banana, cucumber
}

enum Count {
    case zero, one
    case some(i16: Int16), more(i32: Int32), many(Int64)
}

enum DifferentCount: Int {
    case zero = 0
    // libSyntax can't parse this yet:
    // case one = 1, two = 2
    case three = 3
}
