guard let foo = bar else { return }

guard let foo = bar else { return bar() }

guard let foo = bar, let thisIsATriumphLetsSeeasdASDasdasdasdasdas = theWorldIsTooLargeForUs else { return bar() }

// If the target is in the blacklist, don't log it.
guard blacklist(target) == false else { return }

do {
    reuseBag = DisposeBag()

    guard let reuseBag = reuseBag else { return }

    // Start with things not expected to ever change.
}

guard foo else { throw SomeError.error }
