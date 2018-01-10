func foo() {}
func foo() -> Void {}
func foo(bar: Int) {}
func foo(bar: Int) -> Void {}
func foo(_ bar: Int) {}
func foo(_ bar: Int) -> Void {}
func foo(_ bar: Int = 3) {}
func foo(_ bar: Int = 3) -> Void {}
func foo(_ bar: Int, baz: Int) {}
func foo(_ bar: Int, baz: Int) -> Void {}
func foo(_ bar: Int, _ baz: Int) {}
func foo(_ bar: Int, _ baz: Int) -> Void {}

func foo(f: @escaping (Int) -> Int) {}
func foo(f: @escaping (Int) -> Int) -> Void {}
func foo(_ f: @escaping (Int) -> Int) {}
func foo(_ f: @escaping (Int) -> Int) -> Void {}
func foo(_ bar: Int, f: @escaping () -> ()) {}
func foo(_ bar: Int, f: @escaping () -> ()) -> Void {}

func theQuickBrownFoxJumpsOverTheLazyDogTheQuickBrownFoxJumpsOverTheVeryLazyDog() {
    print()
}

func theQuickBrownFoxJumpsOverTheLazyDog(theQuickBrownFoxJumpsOverTheLazyDog: TheQuickBrownFoxJumpsOverTheLazyDog) {
    print()
}

func theQuickBrownFoxJumpsOverTheLazyDog(theQuickBrownFoxJumpsOverTheLazyDog: TheQuickBrownFoxJumpsOverTheLazyDog) -> Bool {
    return true
}

func == (lhs: Record, rhs: Record) -> Bool {
    return lhs.id == rhs.id
}

func isZeroLength(string: String) -> Bool {
    return string.isEmpty
}

class Somewhere {
    func hello<Foo, Bar>(title: String = "Hello", _ args: Any...) throws -> SomeType<Foo> where Foo.E == Bar {
        let arr = [
            1,2,3
        ]
        let dict = [:]()
        _ = hello2(whoCreatesAFunction: "That is sooooooo veeeery long that we need to", breakItToFitTheScreenComeOnNowBREAKBREAKBREAK: false)
        return 42
    }

    func hello2(whoCreatesAFunction: String = "That is so long that we need to", breakItToFitTheScreenComeOnNowBREAKBREAKBREAK: Bool) -> Int {
        print(msg: "hi") {
            print("ho")
        }

        print(msg: "hi") {
            // or what?
            print("ho")
        }

        return 42
    }

    func theQuickBrownFoxJumpsOverTheLazyDog(theQuickBrownFox: TheQuickBrownFox) -> JumpsOverTheLazyDog<(whetherTheDogIsLazyOrNot: Bool, theMaybeLazyDog: TheMaybeLazyDog)> {
        print("jump")
    }
}
