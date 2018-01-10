[1,2,3].map { $0 + 1 }

[1,2,3].map { _ in 42 }

[1,2,3].map { element in
    element + 2
}

[1,2,3].map({ element in
    element + 3
})

[1,2,3].map(transform: { element in
    element + 4
})

[1,2,3].map(transform: { (element) -> Int in
    element + 5
})

[1,2,3].map(transform: { (element: Int) -> Int in
    element + 6
})

[1,2,3].map(transform: { (element: Int) -> Int in
    element + somethingThatIsQuiteLong
})

[1,2,3].map(transform: { (element: Int) -> Int in
    element + somethingThatIsFarTooLongToBePrinted
})

[1,2,3].map(transform: { (element: Int) -> Int in
    let v = element + 7
    return v
})

[1, 2, 3].map { $0 + 1 }.lazy.map { $0 + 2 }.map { $0 + 3 }.map { $0 + 4 }

// Can't be formatted since libSyntax reports it as UnknownExpr
filter { (e) -> Bool in return value != e }

loremIpsumDolorSitAmetConsecteturAdipiscingElitSedDoEiusmodTemporIncididuntUtLabore { _ in }
loremIpsumDolorSitAmetConsecteturAdipiscingElitSedDoEiusmodTemporIncididuntUtLabore { [self] _ in self }

Binder(self.base) { label, color in
    label.textColor = color
}
