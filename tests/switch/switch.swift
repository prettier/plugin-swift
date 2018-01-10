do {
    do {
        switch variable {
        case .foo: fallthrough
        case .foo, .bar: break
        case .error(let message):
            fallthrough
        case let label as UILabel:
            break
        case _ where variable < 20: fallthrough
        case TheQuickBrownFoxJumpsOver.theLazyDog, TheQuickBrownFoxJumpsOver.theVeryLazyDog, TheQuickBrownFoxJumpsOver.theLaziestDog:
            return 123
        default:
            print(12)
        }
    }
}
