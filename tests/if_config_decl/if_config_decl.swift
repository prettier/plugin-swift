#if DEBUG || (arch(i386) || arch(x86_64)) && os(iOS)
    developmentEnvironment = true
#elseif os(macOS)
    developmentEnvironment = false
#else
    developmentEnvironment = 32
#endif

// This doesn't render correctly
class SomeClass {
    #if DEBUG || (arch(i386) || arch(x86_64)) && os(iOS)
        func f1() {
            print("1")
        }
    #elseif os(macOS)
        func f2() {
            print("2")
        }
    #else
        func f3() {
            print("3")
        }
    #endif
}
