do { try foo() } catch {}

do { try foo() } catch { print(error) }

do {
    try foo()
} catch let someError as SomeError {
    print(someError)
}

do {
    try foo()
} catch let someError as SomeError {
    print(someError)
} catch let someOtherError as SomeOtherError {
    print(someOtherError)
}
