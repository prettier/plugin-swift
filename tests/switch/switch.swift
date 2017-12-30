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
        default:
            print(12)
        }
    }
}
