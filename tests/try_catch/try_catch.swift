do {
    try foo()
} catch {
    print(error)
}

do {
    try foo()
} catch let someError as SomeError {
    print(someError)
}
