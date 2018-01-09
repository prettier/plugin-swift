class SomeClass {
    public lazy var isActive = Something.isActive()
    public private(set) lazy var isActive = { Something.isActive }()
}
