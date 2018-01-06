func test() {
    defer { print("hi") }

    defer {
        print("hello")
        print("world")
    }
}
